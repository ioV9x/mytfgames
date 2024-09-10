import { makeServiceIdentifier } from "$node-libs/utils";

export enum LoginState {
  Unknown = -1,
  NotLoggedIn,
  LoggedIn,
}

interface UcpApiService {
  checkLoginState(cancel?: AbortSignal): Promise<LoginState>;
}
const UcpApiService = makeServiceIdentifier<UcpApiService>("ucp api service");
export { UcpApiService };
