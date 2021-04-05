interface CreateMongoDbUriProps {
  host: string;
  port: string;
  database?: string;
  username?: string;
  password?: string;
}

export const createMongoDbUri = (props: CreateMongoDbUriProps) => {
  let credentials = '';
  if (props.username) {
    if (props.password) {
      credentials = `${props.username}:${props.password}@`;
    } else {
      credentials = `${props.username}@`;
    }
  }
  return `mongodb://${credentials}${props.host}:${props.port}/${
    props.database ?? ''
  }`;
};
