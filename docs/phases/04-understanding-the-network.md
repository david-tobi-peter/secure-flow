# Phase 4 · Understanding the Network

## Findings

### The three outcomes of a connecting attempt

A connection attempt ends in one of three ways, and each one tells you which stage decided it.

Connected means the listener exists and policy allowed the packet through.

Refused means the kernel completed the lookup, found no listening socket, and answered with `RST` —
which says the host is here and that port is not. A `REJECT` rule makes the firewall send the same
packet, so a rejected port is indistinguishable from a closed one.

Timed out means the packet was discarded before the lookup, so nothing came back at all and the client
retries until it gives up. `DROP` produces that, and default-deny is `DROP`.

When a system is configured to drop, the implication cuts both ways: a port scanner cannot tell a closed
port from a filtered one, and an internal diagnostic tool may not be able to either.

### NAT

NAT is how a router shares one address among the machines behind it. Outbound, it rewrites the source
address of each packet to its own; when the reply comes back it rewrites the destination to whichever
machine sent it. The server on the other end only ever sees the router's address — it cannot tell which
machine called, or how many are behind it.

A web server in front of an application repeats that loss. It terminates the TCP connection itself, so
it is the only thing the caller talks to, and it opens its own connection to the backend. To tell the
backend what address it saw — the NAT address — it writes it into `X-Forwarded-For`. That header is a
claim and not a measurement: a client can set it just as easily, so the backend is trusting that the
proxy wrote it and that nothing else can reach it.

### Rate limiting by address

Rate limiting by address has the same problem. One address is a household, an office, a carrier's pool,
and a router is all the server sees, so a limit or a ban lands on everyone behind it. Systems work
around that with fingerprinting — the TLS handshake, the user agent, other signals — to tell clients
apart when the address cannot. SecureFlow takes a different route: headless proof-of-work, a
computational cost a client solves with no browser or person involved, which charges each request
instead of naming who sent it.

### DNS

DNS turns a name into an IP address. There is no single server behind it: it is a hierarchy, and each
part of a name is answered by whichever server is authoritative for that part.

A lookup checks `/etc/hosts` first, before any of them is asked. A line in that file answers instead,
which is how a hostname can point at an internal service — a reverse-proxy entry, say — with no DNS query
made at all.

Answers are cached for the record's TTL, usually a few minutes, which is why the second lookup of the
same name is faster than the first.

Nothing in the exchange proves who answered. A query and its reply are unauthenticated datagrams, so a
forged reply is accepted if it arrives first. If that answer gets cached, the resolver serves it to
everyone behind it until the TTL expires. That is poisoning.
