export enum LogsTfUploadMethod {
  Off = 'off', // logs won't be uploaded at all
  Backend = 'backend', // logs will be uploaded only by the backend
  Gameserver = 'gameserver', // logs will be uploaded only by the gameserver
}
