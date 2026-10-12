FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Vite inlines VITE_* at build time, so the API address is a build argument.
ARG VITE_API_URL=http://127.0.0.1:8000
ARG VITE_PROTOTYPE_CONTROLS=false
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PROTOTYPE_CONTROLS=$VITE_PROTOTYPE_CONTROLS
RUN npm run build

# SPA mode (ssr: false): the build is static files in build/client.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 80
