
import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer/index.js";

import { env } from "../config/env.js";

class EmailService {
    private readonly oauth2Client: InstanceType<typeof google.auth.OAuth2>;
    private readonly gmail: ReturnType<typeof google.gmail>;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground",
        );

        this.oauth2Client.setCredentials({
            refresh_token: env.GOOGLE_REFRESH_TOKEN,
        });

        this.gmail = google.gmail({
            version: "v1",
            auth: this.oauth2Client,
        });
    }

    private buildMessage(mail: MailComposer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            mail.compile().build((error, message) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(message);
            });
        });
    }

    async sendEmail(
        to: string,
        subject: string,
        htmlContent: string,
    ): Promise<void> {
        const mail = new MailComposer({
            from: `Weborium Labs <${env.GOOGLE_EMAIL}>`,
            to,
            subject,
            html: htmlContent,
        });

        const message = await this.buildMessage(mail);

        const rawMessage = message
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        await this.gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: rawMessage,
            },
        });
    }
}

export const emailService = new EmailService();
