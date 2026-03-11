# Use an official Node.js runtime as a parent image, using Alpine for a smaller size
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port on which your app runs (e.g., 3000, 4000, 5000)
EXPOSE 3000

# Command to start the application
CMD ["node", "server.js"]
