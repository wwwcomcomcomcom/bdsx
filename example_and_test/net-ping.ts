import { NetworkIdentifierType } from "bdsx/bds/networkidentifier";
import { command } from "bdsx/command";
import { bedrockServer } from "bdsx/launcher";

// NetworkIdentifier.getPing() works for both transports (RakNet and NetherNet). RakPeer is only there for RakNet clients,
// and only when server.properties says transport=raknet, so it is read here, per command, never at load.
command.register("ping", "example for getting ping").overload((params, origin, output) => {
    if (origin.isServerCommandOrigin()) {
        output.error(`[EXAMPLE-PING] You are Server`);
        return;
    }
    const actor = origin.getEntity();
    if (!actor) {
        output.error(`[EXAMPLE-PING] the origin is not an Actor`);
        return;
    }
    const name = actor.getNameTag();
    const ni = actor.getNetworkIdentifier();
    let out = `[EXAMPLE-PING] ${name}'s ping is ${ni.getPing()} ms`; // -1 when it is not known
    if (ni.type === NetworkIdentifierType.RakNet) {
        // RakNet also keeps the last and the lowest ping
        const rakPeer = bedrockServer.rakPeer;
        const address = ni.address;
        out += `
[EXAMPLE-PING] ${name}'s average ping is ${rakPeer.GetAveragePing(address)}
[EXAMPLE-PING] ${name}'s last ping is ${rakPeer.GetLastPing(address)}
[EXAMPLE-PING] ${name}'s lowest ping is ${rakPeer.GetLowestPing(address)}`;
    }
    output.success(out);
}, {});
