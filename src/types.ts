export type PollOption = {
  option: string;
  votes: number;
};

export type MediaType = 'audio' | 'video note' | 'video' | 'sticker' | 'gif' | 'image';

export type CallType = 'voice' | 'video';

export type ContentInformation = {
  content: null | string;
  media: null | MediaType;
  call: null | CallType;
  deleted: boolean;
  edited: boolean;
  poll: null | PollOption[];
};

export type Message = {
  author: string;
  date: Date;
} & ContentInformation;

export interface ParserInput {
  groupName: string;
}

export type MessageGroups = {
  datetime: string;
  author: string;
  content: string;
};
