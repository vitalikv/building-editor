export class JsonModelParser {
  dataModel: any;

  public async getJson() {
    try {
      const data = await this.loadJson('/data.json');
      this.dataModel = data;
      console.log('Загруженные данные:', data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  }

  private async loadJson<T = any>(path: string): Promise<T> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to load JSON:', error);
      throw error;
    }
  }

  public getDataLevels() {
    return this.dataModel.Site.Building.Storeys;
  }

  public getStructureLevel({ targetNumber = null, idLevel = null }) {
    const data = this.dataModel;

    let dataLevel = null;

    if (targetNumber !== null) {
      dataLevel = this.getLevel(data.Site.Building.Storeys, targetNumber);
    }
    if (idLevel !== null) {
      dataLevel = data.Site.Building.Storeys[idLevel];
    }
    console.log('dataLevel', dataLevel);

    const dataWalls = this.getWallsByLevel({ dataLevel, arrWalls: data.Site.Building.Elements.Walls });
    console.log('dataWalls', dataWalls);

    const osW = this.getOpenings({ openings: data.Site.Building.Elements.Openings });

    const dataFloor = this.getDataFloors({ data, dataLevel });

    return { dataLevel, dataWalls, ElementTypes: data.Library.ElementTypes, windowOpenings: data.Site.Building.Elements.WindowOpenings, osW, dataFloor };
  }

  private getLevel(data: any, targetNumber: number) {
    console.log('levels:', data);

    const findLevel = (targetNumber: number) => {
      return data.find((item) => item.Number === targetNumber);
    };

    const level = findLevel(targetNumber);

    return level;
  }

  private getWallsByLevel({ dataLevel, arrWalls }) {
    const dataWalls = arrWalls.filter((item) => item.StoreyId === dataLevel.Id);

    return dataWalls;
  }

  private getOpenings({ openings }) {
    const arr = [];

    for (let i = 0; i < openings.length; i++) {
      const type = openings[i].OpeningType;

      if (type === 'Window') {
        arr.push(openings[i]);
      }
    }

    return arr;
  }

  public getLibraryWindows() {
    console.log('wind:', this.dataModel.Library.Windows);

    return this.dataModel.Library.Windows;
  }

  getDataFloors({ data, dataLevel }) {
    const arrPlate = [];
    const arrStairLanding = [];
    const arrFloor = [];

    const floors = data.Site.Building.Elements.Floors;
    const info = {};

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      if (dataLevel.Id !== floor.StoreyId) continue;

      const type = floor.FloorRoleType;

      if (!info[type]) info[type] = 1;
      else info[type] += 1;

      if (type === 'Plate') arrPlate.push(floor);
      if (type === 'StairLanding') arrStairLanding.push(floor);
      if (type === 'Floor') arrFloor.push(floor);
    }

    return { arrPlate, arrStairLanding, arrFloor };
  }
}
