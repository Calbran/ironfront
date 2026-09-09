FROM node:24.13-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV HOST=0.0.0.0 DB_PATH=/data/warfare.sqlite
EXPOSE 3000
CMD ["npm", "start"]
