FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY start.sh .
RUN chmod +x start.sh
EXPOSE 5000
CMD ["sh", "start.sh"]