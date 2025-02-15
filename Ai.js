// Telegram Bot configuration
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Emojis for categories
const EMOJIS = {
  TEXT_GEN: '📝',
  TEXT_ANALYSIS: '🔍',
  TRANSLATION: '🌐',
  IMAGE_ANALYSIS: '🖼️',
  IMAGE_GEN: '🎨',
  SPEECH: '🎤',
};

// Model categories and commands
const CATEGORIES = {
  TEXT_GEN: 'Text Generation',
  TEXT_ANALYSIS: 'Text Analysis',
  TRANSLATION: 'Translation',
  IMAGE_ANALYSIS: 'Image Analysis',
  IMAGE_GEN: 'Image Generation',
  SPEECH: 'Speech Processing',
};

const HELP_MESSAGE = `
Welcome to the AI Assistant Bot! 🤖✨

Here are the available categories:

${Object.entries(CATEGORIES).map(([key, value]) => `${EMOJIS[key]} ${value}`).join('\n')}

Send /category to see commands for each category.
Send /help to see this message again.
`;

const CATEGORY_COMMANDS = {
  TEXT_GEN: [
    { command: '/llama', description: 'Llama 2 Chat' },
    { command: '/codellama', description: 'Code Llama' },
    { command: '/mistral', description: 'Mistral' },
    { command: '/yi', description: 'Yi Chat' },
  ],
  TEXT_ANALYSIS: [
    { command: '/sentiment', description: 'Analyze sentiment' },
    { command: '/summarize', description: 'Summarize text' },
    { command: '/extract', description: 'Extract information' },
    { command: '/detect_lang', description: 'Detect language' },
  ],
  TRANSLATION: [
    { command: '/translate', description: 'Translate text' },
  ],
  IMAGE_ANALYSIS: [
    { command: '/classify', description: 'Image classification' },
    { command: '/detect', description: 'Object detection' },
    { command: '/segment', description: 'Image segmentation' },
    { command: '/caption', description: 'Image captioning' },
  ],
  IMAGE_GEN: [
    { command: '/stable', description: 'Generate image with Stable Diffusion' },
  ],
  SPEECH: [
    { command: '/speech2text', description: 'Convert speech to text' },
    { command: '/whisper', description: 'Process audio with Whisper' },
  ],
};

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      const payload = await request.json();
      
      if ('message' in payload || 'callback_query' in payload) {
        const chatId = payload.message?.chat.id || payload.callback_query?.message.chat.id;
        const text = payload.message?.text || payload.callback_query?.data || '';
        const command = text.split(' ')[0].toLowerCase();
        const content = text.substring(command.length).trim();

        // Start and Help commands
        if (command === '/start' || command === '/help') {
          return sendTelegramMessage(chatId, HELP_MESSAGE);
        }

        // Category selection
        if (command === '/category') {
          return sendCategoryKeyboard(chatId);
        }

        // Handle category selection
        if (Object.keys(CATEGORIES).includes(command.slice(1))) {
          return sendCommandList(chatId, command.slice(1));
        }

        // Text Generation Models
        if (['/llama', '/codellama', '/mistral', '/yi'].includes(command)) {
          return handleTextGeneration(chatId, content, env.AI, getModelForCommand(command));
        }

        // Text Analysis
        if (['/sentiment', '/summarize', '/extract', '/detect_lang'].includes(command)) {
          return handleTextAnalysis(chatId, content, env.AI, command);
        }

        // Translation
        if (command === '/translate') {
          return handleTranslation(chatId, content, env.AI);
        }

        // Image Analysis
        if (['/classify', '/detect', '/segment', '/caption'].includes(command)) {
          return handleImageAnalysis(chatId, payload.message, command, env.AI);
        }

        // Image Generation
        if (command === '/stable') {
          return handleImageGeneration(chatId, content, env.AI);
        }

        // Speech Processing
        if (['/speech2text', '/whisper'].includes(command)) {
          return handleSpeechProcessing(chatId, payload.message, command, env.AI);
        }

        return sendTelegramMessage(chatId, 'Unknown command. Use /help to see available commands.');
      }
    }

    return new Response('OK', { status: 200 });
  }
};

// Helper Functions

function getModelForCommand(command) {
  const modelMap = {
    '/llama': '@cf/meta/llama-2-7b-chat-int8',
    '/codellama': '@cf/meta/codellama-7b-instruct',
    '/mistral': '@cf/mistral/mistral-7b-instruct-v0.1',
    '/yi': '@cf/yi/yi-34b-chat',
  };
  return modelMap[command];
}

// Handler Functions

async function handleTextGeneration(chatId, prompt, AI, model) {
  if (!prompt) {
    return sendTelegramMessage(chatId, 'Please provide a prompt after the command.');
  }

  try {
    const response = await AI.run(model, {
      messages: [{ role: 'user', content: prompt }]
    });
    return sendTelegramMessage(chatId, response.response);
  } catch (error) {
    return handleError(chatId, error);
  }
}

async function handleTextAnalysis(chatId, text, AI, command) {
  if (!text) {
    return sendTelegramMessage(chatId, 'Please provide text to analyze.');
  }

  try {
    let response;
    switch (command) {
      case '/sentiment':
        response = await AI.run('@cf/huggingface/distilbert-sst2', { text });
        return sendTelegramMessage(chatId, `Sentiment Analysis:\n${JSON.stringify(response, null, 2)}`);
      case '/summarize':
        response = await AI.run('@cf/google/flan-t5-xxl', { text });
        return sendTelegramMessage(chatId, `Summary:\n${response.summary}`);
      case '/extract':
        response = await AI.run('@cf/google/flan-t5-xxl', { text });
        return sendTelegramMessage(chatId, `Extracted Information:\n${response.extracted_information}`);
      case '/detect_lang':
        response = await AI.run('@cf/google/flan-t5-xxl', { text });
        return sendTelegramMessage(chatId, `Detected Language:\n${response.detected_language}`);
    }
  } catch (error) {
    return handleError(chatId, error);
  }
}

async function handleTranslation(chatId, text, AI) {
  if (!text) {
    return sendTranslationKeyboard(chatId);
  }

  const [sourceLang, targetLang, ...textParts] = text.split(' ');
  const textToTranslate = textParts.join(' ');

  if (!sourceLang || !targetLang || !textToTranslate) {
    return sendTelegramMessage(chatId, 'Please use the format: /translate [source_lang] [target_lang] [text]');
  }

  try {
    const response = await AI.run('@cf/meta/m2m100-1.2b', {
      text: textToTranslate,
      source_lang: sourceLang,
      target_lang: targetLang
    });
    return sendTelegramMessage(chatId, `Translation: ${response.translated_text}`);
  } catch (error) {
    return handleError(chatId, error);
  }
}

async function handleImageAnalysis(chatId, message, command, AI) {
  if (!message.photo) {
    return sendTelegramMessage(chatId, 'Please send an image with the command.');
  }

  try {
    const fileId = message.photo[message.photo.length - 1].file_id;
    const fileInfo = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`).then(res => res.json());
    const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    let model;
    switch (command) {
      case '/classify':
        model = '@cf/microsoft/resnet-50';
        break;
      case '/detect':
        model = '@cf/facebook/detr-resnet-50';
        break;
      case '/segment':
        model = '@cf/facebook/detr-resnet-50-panoptic';
        break;
      case '/caption':
        model = '@cf/microsoft/git-large-coco';
        break;
    }

    const result = await AI.run(model, imageBuffer);
    return sendTelegramMessage(chatId, `Analysis Results:\n${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    return handleError(chatId, error);
  }
}

async function handleImageGeneration(chatId, prompt, AI) {
  if (!prompt) {
    return sendTelegramMessage(chatId, 'Please provide a prompt for image generation.');
  }

  try {
    const response = await AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt: prompt
    });
    
    // Convert the generated image to base64 and send it
    const imageBase64 = Buffer.from(response).toString('base64');
    return sendTelegramPhoto(chatId, imageBase64, prompt);
  } catch (error) {
    return handleError(chatId, error);
  }
}

async function handleSpeechProcessing(chatId, message, command, AI) {
  if (!message.voice && !message.audio) {
    return sendTelegramMessage(chatId, 'Please send an audio message or file.');
  }

  try {
    const fileId = message.voice?.file_id || message.audio?.file_id;
    const fileInfo = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`).then(res => res.json());
    const audioUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();

    const model = '@cf/openai/whisper';

    const result = await AI.run(model, audioBuffer);
    return sendTelegramMessage(chatId, `Transcription:\n${result.text}`);
  } catch (error) {
    return handleError(chatId, error);
  }
}

// UI Helper Functions

async function sendCategoryKeyboard(chatId) {
  const keyboard = {
    inline_keyboard: Object.entries(CATEGORIES).map(([key, value]) => [{
      text: `${EMOJIS[key]} ${value}`,
      callback_data: `/${key}`
    }])
  };

  return sendTelegramMessage(chatId, 'Choose a category:', keyboard);
}

async function sendCommandList(chatId, category) {
  const commands = CATEGORY_COMMANDS[category];
  const message = `${EMOJIS[category]} ${CATEGORIES[category]} Commands:\n\n` +
    commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n');

  return sendTelegramMessage(chatId, message);
}

async function sendTranslationKeyboard(chatId) {
  const languagePairs = [
    ['en', 'es'],
    ['es', 'en'],
    ['en', 'fr'],
    ['fr', 'en'],
    ['en', 'de'],
    ['de', 'en'],
  ];

  const keyboard = {
    inline_keyboard: languagePairs.map(([source, target]) => [{
      text: `${source.toUpperCase()} → ${target.toUpperCase()}`,
      callback_data: `/translate ${source} ${target}`
    }])
  };

  return sendTelegramMessage(chatId, 'Choose a translation pair:', keyboard);
}

// Error Handling

function handleError(chatId, error) {
  console.error('Error:', error);
  return sendTelegramMessage(chatId, `An error occurred: ${error.message}`);
}

// Telegram API Helper Functions

async function sendTelegramMessage(chatId, text, reply_markup = null) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: reply_markup
    }),
  });
  return new Response('OK', { status: 200 });
}

async function sendTelegramPhoto(chatId, photoBase64, caption = '') {
  const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo: `data:image/jpeg;base64,${photoBase64}`,
      caption: caption
    }),
  });
  return new Response('OK', { status: 200 });
}
