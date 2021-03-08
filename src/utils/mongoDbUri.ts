interface MongoDbUriProps {
  host: string;
  port: string;
  database?: string;
  username?: string;
  password?: string;
}

export const mongoDbUri = (props: MongoDbUriProps) => {
  let credentials = '';
  if (props.username) {
    if (props.password) {
      credentials = `${props.username}:${props.password}@`;
    } else {
      credentials = `${props.username}@`;
    }
  }
  return `mongodb://${credentials}${props.host}:${props.port}/${props.database ?? ''}`;
};
