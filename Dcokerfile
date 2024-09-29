FROM node:16-alpine
RUN npm install -g gitbook-cli
WORKDIR /gitbook
COPY . /gitbook
# Expose the GitBook serving port
EXPOSE 4000
CMD ["gitbook", "serve", "/gitbook"]
