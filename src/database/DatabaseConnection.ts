
export interface DatabaseConnection {

  query<T = void>(sql: any, parameters?: any[]): Promise<[T, any]>;
  end(): Promise<void>;

}