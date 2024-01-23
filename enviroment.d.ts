declare global {
    namespace NodeJS {
        interface ProcessEnv {
            USERS: String;
            WEBHOOK: string;
        }
    }
}
export {}