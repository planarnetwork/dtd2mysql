
interface Command {
    run(argv: string[]): void | Promise<any>;
}

export default Command;