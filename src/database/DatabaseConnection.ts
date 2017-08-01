
export interface DatabaseConnection {

  query<T = void>(sql: any, parameters?: any[]): any;
  end(): Promise<void>;

}