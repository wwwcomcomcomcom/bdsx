/**
 * The server console's reader on 1.26 (engine layer; docs/findings-inventory.md section 31).
 *
 * BDS reads the console on a thread of its own: DedicatedServer::start builds a ConsoleInputReader (0x68 bytes, held by
 * the unique_ptr at DedicatedServer+0x50) and passes its read loop straight to _beginthreadex. That procedure is the
 * reader's std::thread::_Invoke (40 0xf3810 / 51 0xf3580; the lambda is inlined into it, so it ships under a bdsx: key):
 * it takes the reader from the 8-byte tuple it is handed, reads std::wcin line by line while read_console_ (+0x50) is
 * up, enqueues each line into console_input_ (the SPSCQueue<std::string> at +0), stops after "stop", and returns on
 * EOF without enqueueing anything. The server loop (40 0x88060 / 51 0x88330) dequeues a line per pass and hands it to
 * the console line handler (section 30). DedicatedServer's destructor clears read_console_ and joins the thread, with
 * no unblocking step: today only a typed "stop" lets that join return.
 *
 * Endstone (Apache-2.0) takes the console by pointing stdin at NUL before start, so that this thread's first read
 * fails and it exits, and then starts a reader of its own on console_input_. bdsx needs neither the stdin juggling nor
 * the queue: the thread procedure returns at its first instruction, so BDS never touches stdin and the destructor's
 * join finds a finished thread; node reads stdin (DefaultStdInHandler) and runs each line as the console line handler
 * does (launcher.ts runConsoleLine).
 */
import { procHacker } from "../../prochacker";
import { engineSymbol } from "./deps";

/** BDS's console reader thread procedure, or null when the table lacks it */
const consoleReaderThread = engineSymbol("bdsx:ConsoleInputReader::readThread");

/**
 * Make BDS's console reader thread return at once. Call before BDS's main thread starts (DedicatedServer::start
 * creates the thread). false when the table lacks the procedure or its prologue is not the one read on both builds.
 */
export function disableConsoleReaderThread(): boolean {
    if (consoleReaderThread === null) return false;
    // prettier-ignore
    const prologue = [
        0x55, 0x41, 0x57, 0x41, 0x56, 0x41, 0x55, 0x41, 0x54, 0x56, 0x57, 0x53, // push rbp, r15, r14, r13, r12, rsi, rdi, rbx
        0x48, 0x81, 0xEC, 0xD8, 0x00, 0x00, 0x00, // sub rsp,0xd8
    ];
    for (let i = 0; i < prologue.length; i++) {
        if (consoleReaderThread.getUint8(i) !== prologue[i]) return false;
    }
    // xor eax,eax; ret: the thread exits with 0 before reading. The tuple holding the reader pointer (8 bytes) is not
    // freed, once per boot
    procHacker.write("bdsx:ConsoleInputReader::readThread", 0, new Uint8Array([0x31, 0xc0, 0xc3]), "console-reader-off", prologue);
    return true;
}
