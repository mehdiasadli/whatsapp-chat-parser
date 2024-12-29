# WhatsApp Chat Parser

A robust, type-safe library for parsing exported WhatsApp chat files. Built with TypeScript and Deno, this library provides a clean API for extracting and analyzing WhatsApp chat data, including support for media attachments, polls, calls, and system messages.

## Technical Overview

- Language: TypeScript
- Runtime: Deno/Node.js
- Module Type: ES Modules
- Dependencies: Zero runtime dependencies
- TypeScript Version: ^5.3.3
- Type Definitions: Included

The library employs careful memory management and stream processing techniques to handle large chat exports efficiently. Message parsing is implemented using precise regular expressions, with robust handling of Unicode characters and various message formats.

## Installation

```bash
# npm
npm install @mehdiasadli/whatsapp-chat-parser

# yarn
yarn add @mehdiasadli/whatsapp-chat-parser

# pnpm
pnpm add @mehdiasadli/whatsapp-chat-parser
```

## Usage

### Basic Parsing

```ts
import { Parser } from '@mehdiasadli/whatsapp-chat-parser';

// Initialize parser with group name and optional member list
const parser = new Parser({
  groupName: 'Group Name',
  members: ['John Doe', 'Jane Smith'], // Optional: Filter messages by members
});

// Parse chat export
const chat = await Deno.readTextFile('chat.txt');
const messages = parser.parse(chat);

// Messages are typed and structured
console.log(messages[0]);
// {
//   author: "John Doe",
//   date: Date,
//   content: "Hello, world!",
//   media: null,
//   call: null,
//   poll: null,
//   deleted: false,
//   edited: false
// }
```

### Message Types

The parser distinguishes between different types of messages:

```ts
// Regular text message
{
  author: "John",
  content: "Hello!",
  media: null,
  call: null,
  poll: null
}

// Media message
{
  author: "Jane",
  content: null,
  media: "image",  // "image" | "video" | "audio" | "sticker" | "gif"
  call: null,
  poll: null
}

// Poll message
{
  author: "John",
  content: "What's for lunch?",
  media: null,
  call: null,
  poll: [
    { option: "Pizza", votes: 3 },
    { option: "Sushi", votes: 2 }
  ]
}

// Call message
{
  author: "Jane",
  content: null,
  media: null,
  call: "video",  // "video" | "voice"
  poll: null
}
```

## Edge Cases Handled

- Multi-line messages
- System messages (group changes, member actions)
- Message edits and deletions
- Unicode characters and emojis
- Polls with multiple options
- Various media attachment types
- Call notifications
- Timezone-aware date parsing

## Performance Considerations

The parser is optimized for both memory usage and processing speed:

- Single-pass message parsing
- Efficient regular expression patterns
- Minimal string operations
- No runtime dependencies
- Stream-based file handling

For large chat exports, memory usage grows linearly with the number of messages O(n), while parsing time remains efficient O(n).

## Type Definitions

```ts
interface Message {
  author: string;
  date: Date;
  content: string | null;
  media: MediaType | null;
  call: CallType | null;
  poll: PollOption[] | null;
  deleted: boolean;
  edited: boolean;
}

type MediaType = 'image' | 'video' | 'audio' | 'video_note' | 'sticker' | 'gif';
type CallType = 'voice' | 'video';

interface PollOption {
  option: string;
  votes: number;
}

interface ParserConfig {
  groupName: string;
  members?: string[];
}
```

---

## Technical Details

### Parser Implementation

The parser employs a state machine approach to handle message boundaries and multi-line content:

```ts
// Example of internal processing
const MESSAGE_START = /^\[(\d{2}\.\d{2}\.\d{2}),\s(\d{2}:\d{2}:\d{2})\]/;
const multilineBuffer: string[] = [];
let currentMessage: Partial<Message> | null = null;

for (const line of lines) {
  if (MESSAGE_START.test(line)) {
    // Process buffered message
    if (currentMessage && multilineBuffer.length > 0) {
      finalizeMessage(currentMessage, multilineBuffer);
    }
    // Start new message
    currentMessage = initializeMessage(line);
    multilineBuffer.length = 0;
  } else if (currentMessage) {
    // Accumulate multi-line content
    multilineBuffer.push(line);
  }
}
```

## Error Handling

The parser includes comprehensive error handling for various scenarios:

- Malformed message headers
- Invalid date formats
- Incomplete messages
- Unknown message types
- System message variations
- Unicode parsing errors

Errors are typed and provide contextual information for debugging.
For additional documentation, examples, and advanced usage, please visit the GitHub repository.
