interface MakeConnectStringProps {
  address: string;
  port: string | number;
  password?: string;
}

export const makeConnectString = (props: MakeConnectStringProps) => {
  let connectString = `connect ${props.address}:${props.port}`;
  if (props.password?.length > 0) {
    connectString += `; password ${props.password}`;
  }

  return connectString;
};
