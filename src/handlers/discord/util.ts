import { APIActionRowComponent, APIMessageActionRowComponent, ButtonStyle, ComponentType } from 'discord-api-types/v10';

export function controlButtons(
	pageSize: number,
	currentPage: number,
	pageCount: number
): APIActionRowComponent<APIMessageActionRowComponent>[] {
	return [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					style: ButtonStyle.Primary,
					label: 'Previous',
					custom_id: `previous ${pageSize} ${currentPage}/${pageCount}`,
					disabled: currentPage === 1,
				},
				{
					type: ComponentType.Button,
					style: ButtonStyle.Primary,
					label: 'Next',
					custom_id: `next ${pageSize} ${currentPage}/${pageCount}`,
					disabled: currentPage === pageCount,
				},
			],
		},
	];
}
