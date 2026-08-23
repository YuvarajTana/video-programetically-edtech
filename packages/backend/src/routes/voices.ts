import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {CreateVoiceProfileSchema} from '@video-kit/core/contracts';
import {LANGUAGES, SupportedLocaleSchema} from '@video-kit/core/languages';
import {paths} from '@video-kit/core/config';
import {createReadStream, existsSync, mkdirSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {ingestNarrationAsset} from '../narration-files';
import {ingestVoiceSample} from '../voice-files';
import type {RouteDeps} from './deps';

const IdParams = z.object({id: z.uuid()});

/** Voice profiles, samples, locale previews, and uploaded narration tracks. */
export const voiceRoutes = async (
  app: FastifyInstance,
  {repository, ai, cloudVoice, localVoice}: RouteDeps,
) => {
  app.get('/api/voices', async () => await repository.listVoiceProfiles());

  app.get('/api/narrations', async () => await repository.listNarrationAssets());

  app.post('/api/narrations', async (request, reply) => {
    const upload = await request.file({
      limits: {fileSize: 384 * 1024 * 1024},
    });
    if (!upload) throw new Error('An audio file is required.');
    const field = (name: string) => {
      const value = upload.fields[name];
      if (!value || Array.isArray(value) || value.type !== 'field') {
        throw new Error(`Missing multipart field "${name}".`);
      }
      return String(value.value);
    };
    const label = z.string().trim().min(1).max(120).parse(field('label'));
    const locale = SupportedLocaleSchema.parse(field('locale'));
    const narration = ingestNarrationAsset({
      repository,
      label,
      locale,
      originalFilename: upload.filename,
      mimeType: upload.mimetype,
      data: await upload.toBuffer(),
    });
    return reply.status(201).send(narration);
  });

  app.get('/api/narrations/:id/audio', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const narration = await repository.getNarrationAsset(id);
    const path = resolve(await repository.narrationAssetPath(id));
    const root = resolve(paths.managed(), 'narrations');
    if (!path.startsWith(`${root}${sep}`) || !existsSync(path)) {
      throw new Error('Uploaded narration not found.');
    }
    reply.type(narration.mimeType);
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(createReadStream(path));
  });

  app.post('/api/voices', async (request, reply) => {
    const body = CreateVoiceProfileSchema.parse(request.body);
    if (body.provider !== 'chatterbox') {
      throw new Error(
        'Only the local My Voice engine is enabled for new voice profiles.',
      );
    }
    if (body.enabledLocales.some((locale) => locale !== 'en-US')) {
      throw new Error('The local My Voice engine currently supports English only.');
    }
    return reply.status(201).send(await repository.createVoiceProfile(body));
  });

  app.get('/api/voices/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return {
      profile: await repository.getVoiceProfile(id),
      samples: await repository.listVoiceSamples(id),
      previews: await repository.listVoicePreviews(id),
    };
  });

  app.post('/api/voices/:id/samples', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const upload = await request.file({
      limits: {fileSize: 12 * 1024 * 1024},
    });
    if (!upload) throw new Error('An audio file is required.');
    const field = (name: string) => {
      const value = upload.fields[name];
      if (!value || Array.isArray(value) || value.type !== 'field') {
        throw new Error(`Missing multipart field "${name}".`);
      }
      return String(value.value);
    };
    const purpose = z.enum(['consent', 'reference']).parse(field('purpose'));
    const locale = SupportedLocaleSchema.parse(field('locale'));
    const transcript = z
      .string()
      .trim()
      .min(1)
      .max(8_000)
      .parse(field('transcript'));
    const sample = ingestVoiceSample({
      repository,
      profileId: id,
      purpose,
      locale,
      transcript,
      mimeType: upload.mimetype,
      data: await upload.toBuffer(),
    });
    return reply.status(201).send(sample);
  });

  app.get('/api/voice-samples/:id/audio', async (request, reply) => {
    const {id} = IdParams.parse(request.params);
    const sample = await repository.getVoiceSample(id);
    const path = resolve(await repository.voiceSamplePath(id));
    const voiceRoot = resolve(paths.managed(), 'voices');
    if (!path.startsWith(`${voiceRoot}${sep}`) || !existsSync(path)) {
      throw new Error('Voice sample not found.');
    }
    reply.type(sample.mimeType);
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(createReadStream(path));
  });

  app.post(
    '/api/voices/:id/previews/:locale',
    async (request) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      const selected = await repository.voiceProfileForPreview(
        params.id,
        params.locale,
      );
      const language = LANGUAGES.find(
        (item) => item.locale === params.locale,
      )!;
      const previewText: Record<string, string> = {
        'en-US': 'This is a private preview of my synthetic voice.',
        'hi-IN': 'यह मेरी कृत्रिम आवाज़ का निजी नमूना है।',
        'ta-IN': 'இது எனது செயற்கைக் குரலின் தனிப்பட்ட முன்னோட்டம்.',
        'te-IN': 'ఇది నా కృత్రిమ స్వరానికి చెందిన ప్రైవేట్ నమూనా.',
        'kn-IN': 'ಇದು ನನ್ನ ಕೃತಕ ಧ್ವನಿಯ ಖಾಸಗಿ ಮುನ್ನೋಟ.',
        'ml-IN': 'ഇത് എന്റെ കൃത്രിമ ശബ്ദത്തിന്റെ സ്വകാര്യ മാതൃകയാണ്.',
        'bn-IN': 'এটি আমার কৃত্রিম কণ্ঠের ব্যক্তিগত নমুনা।',
      };
      const directory = resolve(
        paths.managed(),
        'voices',
        params.id,
        'previews',
      );
      mkdirSync(directory, {recursive: true, mode: 0o700});
      const outputPath = join(directory, `${params.locale}.wav`);
      if (selected.version.provider === 'chatterbox') {
        if (params.locale !== 'en-US') {
          throw new Error('The local My Voice engine currently supports English only.');
        }
        await localVoice.synthesize({
          text: previewText[params.locale],
          referencePath: selected.samplePath,
          outputPath,
        });
      } else if (selected.version.provider === 'elevenlabs') {
        if (!selected.version.cloudAllowedAt) {
          throw new Error(
            'This voice profile does not permit cloud voice uploads.',
          );
        }
        await cloudVoice.synthesize({
          text: previewText[params.locale],
          voiceId: selected.version.model,
          outputPath,
          speed: 1,
        });
      } else {
        await ai.synthesize({
          text: previewText[params.locale],
          locale: params.locale,
          referencePath: selected.samplePath,
          referenceTranscript: selected.sample.transcript,
          outputPath,
          speed: 1,
          engine:
            selected.version.provider === 'f5tts' && params.locale === 'en-US'
              ? 'f5tts'
              : 'indicf5',
        });
      }
      await repository.markVoicePreview(params.id, params.locale, outputPath);
      return {
        profileId: params.id,
        locale: params.locale,
        language: language.label,
        audioUrl: `/api/voices/${params.id}/previews/${params.locale}/audio`,
      };
    },
  );

  app.get(
    '/api/voices/:id/previews/:locale/audio',
    async (request, reply) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      const path = resolve(
        await repository.voicePreviewPath(params.id, params.locale),
      );
      const root = resolve(paths.managed(), 'voices', params.id);
      if (!path.startsWith(`${root}${sep}`) || !existsSync(path)) {
        throw new Error('Voice preview not found.');
      }
      reply.type('audio/wav');
      reply.header('Cache-Control', 'private, no-store');
      return reply.send(createReadStream(path));
    },
  );

  app.post(
    '/api/voices/:id/previews/:locale/accept',
    async (request) => {
      const params = z
        .object({id: z.uuid(), locale: SupportedLocaleSchema})
        .parse(request.params);
      return await repository.acceptVoicePreview(params.id, params.locale);
    },
  );

  app.post('/api/voices/:id/revoke', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.revokeVoiceProfile(id);
  });

  app.delete('/api/voices/:id', async (request) => {
    const {id} = IdParams.parse(request.params);
    return await repository.deleteVoiceProfile(id);
  });
};
