FROM node:16-alpine
# Clear npm cache
RUN npm cache clean --force
RUN npm install -g gitbook-cli
WORKDIR /gitbook
COPY . /gitbook
EXPOSE 4000
# Command to serve the book
CMD ["gitbook", "serve", "/gitbook"]
