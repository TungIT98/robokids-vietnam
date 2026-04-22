---
name: minimax-api
description: >
  Use when: Integrating MiniMax AI API, creating AI tutor chatbot
  Do NOT use when: Frontend work, hardware, content creation
---

# MiniMax API Integration Skill

## Overview
MiniMax provides Anthropic-compatible API for AI features. We use it for RoboBuddy - our AI tutor.

## API Configuration
```bash
# Environment variables
MINIMAX_API_KEY=sk-cp-xxxxxxxxxxxx
MINIMAX_ENDPOINT=https://api.minimax.io/anthropic/v1/messages
```

## JavaScript Integration
```javascript
const axios = require('axios');

class MiniMaxAI {
  constructor() {
    this.endpoint = process.env.MINIMAX_ENDPOINT;
    this.apiKey = process.env.MINIMAX_API_KEY;
    this.model = 'MiniMax-M2.5';
  }

  async chat(messages) {
    const response = await axios.post(this.endpoint, {
      model: this.model,
      max_tokens: 4096,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async codeReview(userCode, context) {
    const systemPrompt = {
      role: 'system',
      content: `Em là RoboBuddy, AI tutor vui vẻ, 10 tuổi.
      Giúp các bạn học sinh Việt Nam học lập trình robot.
      Nếu code có lỗi, giải thích bằng từ đơn giản.
      Luôn trả lời bằng tiếng Việt.`
    };

    const userMessage = {
      role: 'user',
      content: `Hãy xem code này và giúp em:\n\n${userCode}\n\n${context}`
    };

    const response = await this.chat([systemPrompt, userMessage]);
    return response.content[0].text;
  }
}

module.exports = new MiniMaxAI();
```

## RoboBuddy Prompt
```
Em là RoboBuddy, một AI tutor vui vẻ và thân thiện!
Em 10 tuổi và rất thích giúp các bạn học sinh Việt Nam
học cách lập trình robot.

Nguyên tắc của em:
1. Dùng từ đơn giản, dễ hiểu
2. Giải thích bằng ví dụ cụ thể
3. Khen ngợi khi làm đúng
4. Gợi ý cải tiến một cách vui vẻ
5. LUÔN trả lời bằng tiếng Việt
```

## Use Cases
| Use Case | Prompt Focus |
|----------|--------------|
| Code help | "Hãy giúp em sửa lỗi..." |
| Concept explain | "Em chưa hiểu vòng lặp..." |
| Project idea | "Gợi ý một project thú vị..." |
| Encouragement | "Robot của em không chạy..." |

## Cost Optimization
- Cache responses when possible
- Use short context (last 5 messages)
- Limit max_tokens to 1024-2048 for simple questions
- Higher tokens (4096) only for code review

## Error Handling
```javascript
try {
  const response = await minimax.chat(messages);
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limited - wait and retry
    await sleep(60000);
    return minimax.chat(messages);
  }
  // Log error, return fallback message
  return "RoboBuddy đang buồn ngủ, hỏi lại sau nhé!";
}
```
