FROM node:20-slim

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /ffmpeg-express

COPY . .

RUN npm install

ENV TZ=Asia/Jakarta

CMD ["node", "main.js"]