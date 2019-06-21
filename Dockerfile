FROM node:10
WORKDIR /app
COPY . .
RUN npm install
CMD npm run start -- --get-timetable && npm run start -- --get-routeing && npm run start -- --get-fares && npm run start -- --fares-clean && npm run start -- --get-nfm64