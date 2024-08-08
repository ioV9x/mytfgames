import { makeServiceIdentifier } from "$main/utils";

export enum LoginState {
  Unknown = -1,
  NotLoggedIn,
  LoggedIn,
}

interface UcpApiService {
  checkLoginState(cancel?: AbortSignal | undefined): Promise<LoginState>;
}
const UcpApiService = makeServiceIdentifier<UcpApiService>("ucp api service");
export { UcpApiService };
