export interface Message {
  id: string;
  text: string;
  timestamp: Date | string;
  isSent: boolean;
}
