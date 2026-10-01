import { getState, logAudit } from './state.js';
import { chatCompletionSync } from './ai.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { createTask, addTaskStep, updateTask, setAgentStatus } from './tasks.js';

// Agent definitions — each agent is specialized for a role
export const AGENTS = [
  {
    id: 'director',
    name: 'DIRECTOR',
    icon: '🧠',
    description: 'Manages the entire project — creates plans, selects agents, coordinates workflow.',
    systemPrompt: `You are the DIRECTOR agent for FNFAI-REAL-MODS, an AI studio for creating Friday Night Funkin' mods.
Your job is to understand the user's request, create a project plan, and select which specialized agents are needed.
Break down the request into steps and assign each step to the appropriate agent.
Available agents: STORY, DRAW, ANIMATION, MUSIC, CHART, STAGE, CODE, CUTSCENE, SHADER, TESTER, BUILDER.
Output a structured plan with clear steps. Only select agents that are actually needed for the request.`,
    tools: [],
  },
  {
    id: 'story',
    name: 'STORY AI',
    icon: '📖',
    description: 'Creates story structure, weeks, songs, and cutscenes narrative.',
    systemPrompt: `You are the STORY AI agent for FNFAI-REAL-MODS.
You create the narrative structure for FNF mods: story, weeks, song lists, and cutscene scripts.
Output structured JSON for weeks and story data that follows Psych Engine 0.6.3 format.`,
    tools: ['write_file', 'read_file', 'list_directory'],
  },
  {
    id: 'draw',
    name: 'DRAW AI',
    icon: '🎨',
    description: 'Works with graphics, sprites, backgrounds, and visual assets.',
    systemPrompt: `You are the DRAW AI agent for FNFAI-REAL-MODS.
You organize and manage visual assets: character sprites, backgrounds, UI elements.
Describe sprite layouts, character atlas structures, and image organization.
For Psych Engine, characters use XML + PNG sprite sheets.`,
    tools: ['write_file', 'read_file', 'list_directory'],
  },
  {
    id: 'animation',
    name: 'ANIMATION AI',
    icon: '🕺',
    description: 'Organizes character animations and user-provided elements.',
    systemPrompt: `You are the ANIMATION AI agent for FNFAI-REAL-MODS.
You define animation data for FNF characters: idle, sing-left, sing-down, sing-up, sing-right, miss animations.
For Psych Engine, animations are defined in the character XML file with frame indices and frame rates.`,
    tools: ['write_file', 'read_file'],
  },
  {
    id: 'music',
    name: 'MUSIC AI',
    icon: '🎵',
    description: 'Analyzes BPM, song structure, and musical sections.',
    systemPrompt: `You are the MUSIC AI agent for FNFAI-REAL-MODS.
You analyze song structure: BPM, time signature, sections (intro, verse, chorus, bridge, outro).
Provide metadata for chart creation. Define song data JSON for Psych Engine format.`,
    tools: ['write_file', 'read_file'],
  },
  {
    id: 'chart',
    name: 'CHART AI',
    icon: '🎹',
    description: 'Creates and edits FNF charts with note patterns.',
    systemPrompt: `You are the CHART AI agent for FNFAI-REAL-MODS.
You create FNF charts in Psych Engine 0.6.3 JSON format.
Charts contain: song info, BPM, sections with notes (mustHitSection, lengthInSteps, sectionNotes).
Each note is [strumTime, noteData, sustainLength] where noteData maps to arrows.
Generate playable, rhythmically appropriate charts based on BPM and song structure.`,
    tools: ['write_file', 'read_file', 'list_directory'],
  },
  {
    id: 'stage',
    name: 'STAGE AI',
    icon: '🌆',
    description: 'Creates stage configuration and background setup.',
    systemPrompt: `You are the STAGE AI agent for FNFAI-REAL-MODS.
You create stage configuration for Psych Engine using Lua scripts.
Stages define: background sprites, character positions, camera zoom, layering, and visual effects.
Generate Lua stage files following Psych Engine 0.6.3 stage format.`,
    tools: ['write_file', 'read_file'],
  },
  {
    id: 'code',
    name: 'CODE AI',
    icon: '💻',
    description: 'Creates Lua, JSON, Haxe, and other required code files.',
    systemPrompt: `You are the CODE AI agent for FNFAI-REAL-MODS.
You generate all code files: Lua scripts, JSON configs, Haxe source, and any other code needed.
Follow Psych Engine 0.6.3 conventions and file formats precisely.`,
    tools: ['write_file', 'read_file', 'list_directory', 'create_directory'],
  },
  {
    id: 'cutscene',
    name: 'CUTSCENE AI',
    icon: '🎬',
    description: 'Creates cutscene data and dialogue sequences.',
    systemPrompt: `You are the CUTSCENE AI agent for FNFAI-REAL-MODS.
You create cutscene scripts and dialogue data for Psych Engine.
Dialogues use the Psych Engine dialogue format with character portraits, text, and timing.`,
    tools: ['write_file', 'read_file'],
  },
  {
    id: 'shader',
    name: 'SHADER AI',
    icon: '✨',
    description: 'Creates procedural shader effects.',
    systemPrompt: `You are the SHADER AI agent for FNFAI-REAL-MODS.
You create GLSL fragment shaders for visual effects (corruption, glitch, chromatic aberration, etc.).
For Psych Engine, shaders are .frag files using the OpenGL ES format.`,
    tools: ['write_file', 'read_file'],
  },
  {
    id: 'tester',
    name: 'TESTER AI',
    icon: '🧪',
    description: 'Runs the project, analyzes errors, and reports results.',
    systemPrompt: `You are the TESTER AI agent for FNFAI-REAL-MODS.
You validate projects, run builds, analyze error logs, and report issues.
If errors are found, describe them clearly so the CODE AI can fix them.
Use the run_command tool to execute build/test commands.`,
    tools: ['run_command', 'read_file', 'list_directory'],
  },
  {
    id: 'builder',
    name: 'BUILDER AI',
    icon: '📦',
    description: 'Assembles the final mod package for distribution.',
    systemPrompt: `You are the BUILDER AI agent for FNFAI-REAL-MODS.
You assemble all project files into a final mod package.
Verify all required files are present, validate the structure, and create a build summary.
Use list_directory and read_file to verify completeness.`,
    tools: ['read_file', 'list_directory', 'run_command'],
  },
];

export function getAgent(id) {
  return AGENTS.find((a) => a.id === id);
}

export function getAllAgents() {
  return AGENTS;
}

// Orchestrator: manages the full agent workflow
export class Orchestrator {
  constructor() {
    this.state = getState();
  }

  // Run the orchestration for a user request
  // Returns an async generator yielding events
  async *run(userMessage, project = null) {
    // Step 1: Director creates a plan
    yield { type: 'agent_start', agentId: 'director', agentName: 'DIRECTOR', icon: '🧠' };

    setAgentStatus('director', 'running');
    const task = createTask('Create FNF Mod', userMessage, 'director');
    yield { type: 'task_created', task };

    try {
      const plan = await this.getPlan(userMessage);
      yield { type: 'plan', plan };

      // Step 2: Execute each agent in the plan
      for (const step of plan.steps) {
        const agent = getAgent(step.agentId);
        if (!agent) continue;

        yield { type: 'agent_start', agentId: agent.id, agentName: agent.name, icon: agent.icon };
        setAgentStatus(agent.id, 'running');
        addTaskStep(task.id, step.description, 'running');
        yield { type: 'task_step_update', taskId: task.id, stepIndex: task.steps.length - 1, status: 'running' };

        try {
          const result = await this.runAgent(agent, step, project, userMessage, plan);
          updateTaskStep(task.id, task.steps.length - 1, 'success');
          yield { type: 'task_step_update', taskId: task.id, stepIndex: task.steps.length - 1, status: 'success' };
          yield { type: 'agent_done', agentId: agent.id, result };
          setAgentStatus(agent.id, 'idle', result);
        } catch (error) {
          updateTaskStep(task.id, task.steps.length - 1, 'failed');
          yield { type: 'task_step_update', taskId: task.id, stepIndex: task.steps.length - 1, status: 'failed' };
          yield { type: 'agent_error', agentId: agent.id, error: error.message };
          setAgentStatus(agent.id, 'error', error.message);
        }
      }

      updateTask(task.id, { status: 'SUCCESS', result: 'Completed' });
      yield { type: 'task_complete', taskId: task.id, status: 'SUCCESS' };
    } catch (error) {
      updateTask(task.id, { status: 'FAILED', result: error.message });
      yield { type: 'task_complete', taskId: task.id, status: 'FAILED', error: error.message };
    }

    setAgentStatus('director', 'idle');
    yield { type: 'orchestration_done' };
  }

  // Get a plan from the Director agent
  async getPlan(userMessage) {
    const directorAgent = getAgent('director');
    const messages = [
      { role: 'system', content: directorAgent.systemPrompt },
      {
        role: 'user',
        content: `User request: "${userMessage}"
        
Create a plan as a JSON object with this format:
{
  "summary": "Brief summary of what will be created",
  "steps": [
    { "agentId": "story", "description": "What this agent should do" },
    { "agentId": "chart", "description": "What this agent should do" }
  ]
}

Only include agents that are needed. Available agent IDs: story, draw, animation, music, chart, stage, code, cutscene, shader, tester, builder.
Return ONLY the JSON, no other text.`,
      },
    ];

    const response = await chatCompletionSync(messages);
    const content = response.content || '';

    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    // Fallback plan
    return {
      summary: 'Create FNF mod based on user request',
      steps: [
        { agentId: 'story', description: 'Create story and week structure' },
        { agentId: 'code', description: 'Create project files and configuration' },
        { agentId: 'chart', description: 'Create chart data' },
        { agentId: 'tester', description: 'Validate the project' },
      ],
    };
  }

  // Run a single agent with tool calling
  async runAgent(agent, step, project, userMessage, plan) {
    const agentTools = agent.tools.map((toolName) =>
      TOOL_DEFINITIONS.find((t) => t.name === toolName)
    ).filter(Boolean);

    const messages = [
      { role: 'system', content: agent.systemPrompt },
      {
        role: 'user',
        content: `User request: "${userMessage}"
Plan summary: ${plan.summary}
Your task: ${step.description}
${project ? `Project name: ${project}` : 'No project created yet.'}

Execute your task. If you need to create files, use the write_file tool with the project name. Generate real, valid content for Psych Engine 0.6.3 format.`,
      },
    ];

    const result = await this.runWithTools(messages, agentTools, agent.id, project);
    return result;
  }

  // Run AI with tool calling loop (max 10 iterations)
  async runWithTools(messages, tools, agentId, project, maxIterations = 10) {
    let allToolResults = [];

    for (let i = 0; i < maxIterations; i++) {
      const response = await chatCompletionSync(messages, tools);

      if (response.content) {
        messages.push({ role: 'assistant', content: response.content });
      }

      if (response.tool_calls && response.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls,
        });

        for (const tc of response.tool_calls) {
          const toolName = tc.function.name;
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {}

          // Inject project if not specified
          if (project && !args.project && ['read_file', 'write_file', 'list_directory', 'create_directory', 'search_files'].includes(toolName)) {
            args.project = project;
          }

          const result = await executeTool(toolName, args);
          allToolResults.push({ tool: toolName, result });

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        // No tool calls — agent is done
        break;
      }
    }

    return allToolResults.length > 0
      ? { toolResults: allToolResults, message: messages[messages.length - 1]?.content || 'Done' }
      : { message: messages[messages.length - 1]?.content || 'Done' };
  }
}
