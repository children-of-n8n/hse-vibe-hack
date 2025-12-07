FROM oven/bun:1.2.2 AS build

WORKDIR /app

# Install workspace dependencies so frontend can type-check imports from the backend sources.
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN bun install --frozen-lockfile --ignore-scripts

ARG API_BASE_URL=https://backend.hsevibehack.hacks.intezya.ru
ENV VITE_API_BASE_URL=${API_BASE_URL}

# Copy source code for both frontend and backend (frontend uses backend DTOs/types).
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend
RUN bun run build

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
#COPY --from=build /app /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
