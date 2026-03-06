import { SettingsService } from "@app/services/settings/settings.service";

export function settingsServiceFactory(settings: SettingsService): Promise<any> {
    return settings.loadAppData();
}
