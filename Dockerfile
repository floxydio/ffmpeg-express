FROM node:20-slim

WORKDIR /ffmpeg-express

COPY . .

RUN npm install

ENV TZ=Asia/Jakarta

CMD ["node", "main.js"]