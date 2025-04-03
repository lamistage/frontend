FROM node:22.14.0

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
RUN npm install -g @angular/cli
COPY . .

EXPOSE 4200
CMD ["/usr/local/bin/ng", "serve", "--proxy-config", "proxy.conf.json", "--host", "0.0.0.0", "--port", "4200"]