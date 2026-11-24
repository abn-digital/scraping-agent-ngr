FROM node:20-slim
WORKDIR /app
COPY package.json ./
COPY index.mjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.mjs"]
