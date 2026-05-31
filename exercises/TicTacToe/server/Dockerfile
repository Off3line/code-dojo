# Tic-Tac-Toe server container.
#
# Base: Red Hat UBI 8 + Node.js 20.
#   - UBI is freely redistributable (no subscription needed) and is the natural
#     fit for a RHEL Docker host, including air-gapped / proxied corporate setups.
#   - UBI 8 (not 9) is chosen on purpose: the server must run on a RHEL 7 OR 8
#     Docker host, and UBI 9's glibc can fail on RHEL 7's older kernel.
#
# Reproducibility: for a locked, identical build in the business environment,
# pin the base image by digest instead of a floating tag, e.g.
#   FROM registry.access.redhat.com/ubi8/nodejs-20@sha256:<digest>
# Get the digest with:  podman pull <image> && podman inspect --format '{{.Digest}}' <image>
FROM registry.access.redhat.com/ubi8/nodejs-20:latest

# UBI Node images default to the non-root user 1001, group root (0),
# with WORKDIR /opt/app-root/src.
WORKDIR /opt/app-root/src

ENV NODE_ENV=production \
    PORT=3001

# 1) Dependencies first, for layer caching. `npm ci` installs the EXACT versions
#    from package-lock.json; --omit=dev drops nodemon/vitest/socket.io-client
#    (only express + socket.io and their transitive deps ship at runtime).
COPY --chown=1001:0 package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 2) Application source (server only).
COPY --chown=1001:0 engine.js matchmaking.js index.js ./

EXPOSE 3001

# Liveness check via the built-in /health endpoint (uses node, so no curl needed).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "index.js"]
