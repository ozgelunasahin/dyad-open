export interface EmailMessage {
	to: string;
	subject: string;
	html: string;
}

export interface EmailProvider {
	readonly name: string;
	send(message: EmailMessage): Promise<boolean>;
}

export { ResendEmailProvider } from './resend.js';
export { MailpitEmailProvider } from './mailpit.js';
export { MigaduEmailProvider } from './migadu.js';
