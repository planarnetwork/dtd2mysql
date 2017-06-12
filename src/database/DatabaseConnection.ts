
export interface DatabaseConnection {

  query<T = void>(sql: any, parameters?: any[]): Promise<T>
  end(): Promise<void>;

}