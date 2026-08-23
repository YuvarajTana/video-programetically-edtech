import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {
  GeneratedScriptSchema,
  type GeneratedScriptResult,
  type ScriptGenerationInput,
  type ScriptGenerationStatus,
} from '@video-kit/core/contracts';
import type {CategoryDefinition, TemplateDefinition} from '@video-kit/core/contracts';
import {
  musicPlanningWordRange,
  sceneCountForVideo,
  secondsForVideoFormat,
  voiceoverWordRange,
} from '@video-kit/core/durations';
import {contextForGeneration, loadScriptContext} from './script-context';

export type ScriptGenerationContext = {
  category: CategoryDefinition;
  template: TemplateDefinition;
};

export interface ScriptGenerator {
  status(): ScriptGenerationStatus;
  generate(
    input: ScriptGenerationInput,
    context: ScriptGenerationContext,
  ): Promise<GeneratedScriptResult>;
}

const wordsIn = (value: string) =>
  value.trim().split(/\s+/u).filter(Boolean).length;

export class OpenAiScriptGenerator implements ScriptGenerator {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly client: OpenAI | null;
  private readonly scriptContext = loadScriptContext();

  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_SCRIPT_MODEL ?? 'gpt-5.6-sol',
  }: {apiKey?: string; model?: string} = {}) {
    this.apiKey = apiKey?.trim() || undefined;
    this.model = model;
    this.client = this.apiKey ? new OpenAI({apiKey: this.apiKey}) : null;
  }

  status(): ScriptGenerationStatus {
    return {
      configured: Boolean(this.client),
      provider: 'openai',
      model: this.model,
      detail: this.client
        ? `OpenAI script generation is ready with ${this.scriptContext.version}.`
        : 'Set OPENAI_API_KEY in .env to enable AI script generation.',
    };
  }

  async generate(
    input: ScriptGenerationInput,
    {category, template}: ScriptGenerationContext,
  ): Promise<GeneratedScriptResult> {
    if (!this.client) {
      throw new Error(
        'OpenAI script generation is not configured. Add OPENAI_API_KEY to .env and restart the Studio.',
      );
    }
    const generationContext = contextForGeneration(
      this.scriptContext,
      category.id,
      input.format,
    );
    const targetSeconds =
      input.targetSeconds ?? secondsForVideoFormat(input.format);
    const sceneCount = sceneCountForVideo(input.format, targetSeconds);
    const requiredWordRange: [number, number] =
      input.audioMode === 'music-only'
        ? musicPlanningWordRange(input.format, targetSeconds)
        : voiceoverWordRange(input.format, targetSeconds);
    if (template.slots.some((slot) => slot.sceneType === 'motionCanvas')) {
      throw new Error(
        'Motion Explainer AI storyboarding is not enabled yet. Use a standard template for AI generation.',
      );
    }
    const repeatable = template.slots.find((slot) => slot.repeatable);
    const fixedSlots = template.slots.filter((slot) => !slot.repeatable);
    const repeatCount = Math.max(0, sceneCount - fixedSlots.length);
    const plannedSlots = template.slots.flatMap((slot) =>
      slot.repeatable
        ? Array.from({length: repeatCount}, (_, index) => ({
            label: `${slot.label} ${index + 1}`,
            sceneType: slot.sceneType,
            durationSeconds: slot.durationSeconds,
          }))
        : [{
            label: slot.label,
            sceneType: slot.sceneType,
            durationSeconds: slot.durationSeconds,
          }],
    );
    if (plannedSlots.length !== sceneCount) {
      throw new Error(
        `Template ${template.label} cannot expand to ${sceneCount} script scenes.`,
      );
    }
    const response = await this.client.responses.parse({
      model: this.model,
      reasoning: {effort: 'medium'},
      store: false,
      instructions: [
        'Create one production-ready, visual-first video script using the supplied Video Kit context.',
        'Treat the context as product requirements, not optional inspiration.',
        'Return exactly the requested scenes in the requested order and scene types.',
        input.audioMode === 'music-only'
          ? 'This is a music-only video with no voiceover. Treat narration as concise scene-planning copy. Every idea must be understandable through animation, onScreenText, visualLabels, and codeVisual without spoken explanation.'
          : 'Narration must sound natural when spoken. Put punctuation-heavy code in codeVisual, then explain its runtime behavior in narration.',
        'Keep narration inside the requested total word range. Do not add Markdown or timestamps.',
        'Make visualDirection concrete enough for a motion designer to implement with the named scene type.',
        'For codeVisual, prefer a compact runnable sample. When runtime order matters, visualDirection must name the exact line sequence to highlight or execute and the value or output each important line produces.',
        'Use semantic diagram shapes rather than defaulting every concept to circles: diamonds for decisions, documents for files or prompts, databases for storage, pills for actions, and hexagons for services or processing.',
        'Vary animation by teaching purpose: reveal relationships with path draws and handoffs, show state changes with transforms, and reserve pulses for moments that truly need emphasis.',
        'Return two to six short visualLabels for flow, steps, architecture, compare, stats, and card scenes; otherwise return an empty array.',
        'Use an empty string for codeVisual when the scene does not need code.',
        'Do not invent facts. Add specific manual checks for claims, code behavior, and visual-to-narration consistency.',
      ].join('\n'),
      input: JSON.stringify({
        videoKitContext: generationContext,
        topic: input.topic,
        direction: input.direction || undefined,
        format: input.format,
        targetSeconds,
        audioMode: input.audioMode,
        requiredTotalWordRange: requiredWordRange,
        requiredSceneCount: sceneCount,
        pacing: input.audioMode === 'music-only'
          ? 'Use the word range for concise visual-planning copy, not spoken narration.'
          : `Target ${requiredWordRange[0]}–${requiredWordRange[1]} spoken words across ${sceneCount} scenes.`,
        locale: input.locale,
        audienceLevel: input.audienceLevel,
        channel: category.label,
        template: template.label,
        requiredScenePlan: plannedSlots,
      }),
      text: {
        format: zodTextFormat(GeneratedScriptSchema, 'video_script'),
      },
    });
    const draft = response.output_parsed;
    if (!draft) {
      throw new Error('OpenAI did not return a usable script draft. Try a clearer topic.');
    }
    if (draft.scenes.length !== sceneCount) {
      throw new Error(
        `OpenAI returned ${draft.scenes.length} scenes; this format requires exactly ${sceneCount}. Regenerate the draft.`,
      );
    }
    const scenes = draft.scenes.map((scene, index) => ({
      ...scene,
      sceneType: plannedSlots[index].sceneType as typeof scene.sceneType,
    }));
    const paragraphs = scenes.map((scene) => scene.narration);
    const script = paragraphs.join('\n\n');
    const wordCount = wordsIn(script);
    if (
      wordCount < requiredWordRange[0] ||
      wordCount > requiredWordRange[1]
    ) {
      throw new Error(
        `OpenAI returned ${wordCount} ${input.audioMode === 'music-only' ? 'visual-planning' : 'narration'} words; this format requires ${requiredWordRange[0]}–${requiredWordRange[1]}. Regenerate the draft.`,
      );
    }
    const reviewChecklist = [
      input.audioMode === 'music-only'
        ? `Confirm all ${sceneCount} scenes communicate clearly without voiceover.`
        : `Confirm the storyboard has exactly ${sceneCount} scenes and ${wordCount} spoken words.`,
      ...draft.reviewChecklist.filter(
        (item) => !/\b(?:word count|spoken words?|exactly \d+ scenes?)\b/iu.test(item),
      ),
    ].slice(0, 6);
    return {
      ...draft,
      scenes,
      reviewChecklist,
      paragraphs,
      script,
      wordCount,
      targetSeconds,
      model: this.model,
      contextVersion: generationContext.contextVersion,
    };
  }
}
