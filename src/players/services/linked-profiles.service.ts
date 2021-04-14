import { Injectable } from '@nestjs/common';

interface LinkedProfileProvider {
  name: string;
  fetchProfile: (playerId: string) => Promise<any> | any;
}

@Injectable()
export class LinkedProfilesService {
  private linkedProfileProviders: LinkedProfileProvider[] = [];

  registerLinkedProfileProvider(linkedProfileProvider: LinkedProfileProvider) {
    this.linkedProfileProviders.push(linkedProfileProvider);
  }

  async getLinkedProfiles(playerId: string): Promise<any[]> {
    return (
      await Promise.all(
        this.linkedProfileProviders.map(async (provider) => {
          try {
            const profile = await provider.fetchProfile(playerId);
            return { ...profile, provider: provider.name };
          } catch (_error) {
            return null;
          }
        }),
      )
    ).filter((profile) => profile !== null);
  }
}
