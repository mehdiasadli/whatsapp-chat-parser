import type {
  CallType,
  ContentInformation,
  MediaType,
  Message,
  MessageGroups,
  ParserInput,
  PollOption,
} from './types.ts';

export class Parser {
  private chat: string = '';
  private groupName: string;

  private MESSAGE_REGEX = /^(?<datetime>\[\d{2}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2}\]) (?<author>[^:]+): (?<content>.*)$/s;
  private MESSAGE_START_REGEX = /^\[\d{2}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2}\]/;
  private EDITED_CONTENT_REGEX = /<This message was edited>$/;
  private DELETED_CONTENT_REGEX =
    /(This message was deleted\.)|(You deleted this message\.)|(You deleted this message as admin)$/;

  private MediaRegexes: { media: MediaType; regex: RegExp }[] = [
    {
      media: 'video note',
      regex: /video note omitted$/,
    },
    {
      media: 'video',
      regex: /video omitted$/,
    },
    {
      media: 'image',
      regex: /image omitted$/,
    },
    {
      media: 'gif',
      regex: /GIF omitted$/,
    },
    {
      media: 'sticker',
      regex: /sticker omitted$/,
    },
    {
      media: 'audio',
      regex: /audio omitted$/,
    },
  ];

  private VOICE_CALL_REGEX = /(Call\. .+)|(Missed voice call\. .+)|(.+ started a call)/;
  private VIDEO_CALL_REGEX = /(Video call\. .+)|(Missed video call\. .+)|(.+ started a video call)/;
  private ADD_REMOVE_REGEX = /(.+ added .+)|(.+ joined using .+)|(.+ was added)|(.+ removed .+)/;

  private POLL_REGEX = /^POLL:\n(?<content>[^\n]+)\n(?<options>(?:OPTION:[\s\S]*?(?:\(\d+ votes?\)\n?))+)$/;
  private POLL_OPTIONS_REGEX = /OPTION:(?<text>[\s\S]*?)\((?<votes>\d+) votes?\)/g;

  public static create(input: ParserInput) {
    if (!input.groupName) {
      throw new Error('Group name is required');
    }

    return new Parser(input);
  }

  constructor(input: ParserInput) {
    this.groupName = input.groupName;
  }

  private edited(content: string) {
    const [newContent, edited] = content.split(this.EDITED_CONTENT_REGEX);

    return {
      content: newContent,
      edited: edited !== undefined,
    };
  }

  private deleted(content: string) {
    const isDeleted = this.DELETED_CONTENT_REGEX.test(content);

    return {
      content: isDeleted ? null : content,
      deleted: isDeleted,
    };
  }

  private getCallInfo(content: string): CallType | null {
    if (this.VOICE_CALL_REGEX.test(content)) {
      return 'voice';
    }

    if (this.VIDEO_CALL_REGEX.test(content)) {
      return 'video';
    }

    return null;
  }

  private getMediaInfo(content: string): MediaType | null {
    const result = this.MediaRegexes.find((item) => item.regex.test(content));
    return result?.media ?? null;
  }

  public async init(filePath: string): Promise<Parser> {
    const result = await Deno.readTextFile(filePath);
    this.chat = result.trim() ?? '';

    return this;
  }

  private parseLines() {
    if (!this.chat) {
      throw new Error('Chat is empty');
    }

    const raw = this.chat.replace(/\u200e/g, '').split('\n');
    const lines: string[] = [];

    let current: string | null = null;

    for (let i = 0; i < raw.length; i++) {
      const line = raw[i].trim();

      if (!line) continue;
      if (this.MESSAGE_START_REGEX.test(line)) {
        if (current !== null) {
          lines.push(current);
        }

        current = line;
      } else {
        if (current === null) {
          console.warn(`Found content without message header at line ${i + 1}: ${line}`);
          continue;
        }
        current += '\n' + line;
      }
    }

    if (current !== null) {
      lines.push(current);
    }

    return lines;
  }

  private parseDatetime(datetime: string) {
    const [day, month, year, , hours, minutes, seconds] = datetime.slice(1, -1).split(/[\.:(, )]/);
    return new Date(+year + 2000, +month - 1, +day, +hours, +minutes, +seconds);
  }

  private parsePoll(content: string | null): { content: string; options: PollOption[] } | null {
    if (!content) return null;

    const pollMatch = this.POLL_REGEX.exec(content.trim());
    if (!pollMatch?.groups) return null;

    const { content: pollContent, options: optionsText } = pollMatch.groups;
    const options: PollOption[] = [];

    for (const match of optionsText.matchAll(this.POLL_OPTIONS_REGEX)) {
      if (!match.groups) continue;

      options.push({
        option: match.groups.text.trim(),
        votes: parseInt(match.groups.votes, 10),
      });
    }

    return {
      content: pollContent.trim(),
      options,
    };
  }

  private parseContent(content: string): ContentInformation {
    let finalContent: string | null = content;

    const { content: deletedContent, deleted } = this.deleted(content);
    finalContent = deletedContent;
    const { content: editedContent, edited } = this.edited(content);
    finalContent = editedContent;

    const media = this.getMediaInfo(finalContent);
    const call = this.getCallInfo(finalContent);
    const poll = this.parsePoll(finalContent);

    if (media !== null || call !== null) {
      finalContent = null;
    }

    if (poll) {
      finalContent = poll.content;
    }

    return {
      content: finalContent,
      edited,
      deleted,
      poll: poll === null ? null : poll.options,
      call,
      media,
    };
  }

  private parseMessages(lines: string[]): Message[] {
    return lines
      .map<Message | undefined>((line) => {
        const match = this.MESSAGE_REGEX.exec(line);

        if (!match) {
          return undefined;
        }

        const groups = match.groups as MessageGroups;
        const author = groups.author.trim();

        if (author === this.groupName) {
          return undefined;
        }

        const content = this.parseContent(groups.content);

        if (content.content && this.ADD_REMOVE_REGEX.test(content.content)) {
          return undefined;
        }

        return {
          author: groups.author.trim(),
          date: this.parseDatetime(groups.datetime),
          ...content,
        };
      })
      .filter(Boolean) as Message[];
  }

  public parse(): Message[] {
    return this.parseMessages(this.parseLines());
  }
}
