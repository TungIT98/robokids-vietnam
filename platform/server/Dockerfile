# Use official Node.js lightweight image
FROM node:18-alpine

# Use production mode
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install NO devDependencies to keep image small
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose server port (default 3100)
# Make sure to map this in your deployment configuration
EXPOSE 3100

# Start server
CMD [ "npm", "start" ]
