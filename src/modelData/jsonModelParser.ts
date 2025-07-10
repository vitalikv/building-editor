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

    // console.log('-----');
    // console.log('Elements:', data.Library.ElementTypes);

    let dataLevel = null;

    if (targetNumber !== null) {
      dataLevel = this.getLevel(data.Site.Building.Storeys, targetNumber);
    }
    if (idLevel !== null) {
      dataLevel = data.Site.Building.Storeys[idLevel];
    }
    //console.log('dataLevel', dataLevel);

    const dataWalls = this.getWallsByLevel({ dataLevel, arrWalls: data.Site.Building.Elements.Walls });
    console.log('dataWalls', dataWalls);

    const dataWalls2 = this.getWindowsByWalls({ dataWalls, arrWindows: data.Site.Building.Elements.WindowOpenings });

    const osW = this.getOpenings({ openings: data.Site.Building.Elements.Openings });

    return { dataLevel, dataWalls, ElementTypes: data.Library.ElementTypes, windowOpenings: data.Site.Building.Elements.WindowOpenings, osW };
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

  private getWindowsByWalls({ dataWalls, arrWindows }) {
    for (let i = 0; i < arrWindows.length; i++) {
      // const openingGroup = arrWindows[i].OpeningGroup;
      // for (let i2 = 0; i2 < openingGroup.length; i2++) {
      //   const id = openingGroup[i2];
      //   const r = dataWalls.filter((item) => item.Id === id);
      //   if (r.length > 0) console.log(55555, r);
      // }
    }
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

  getWindows() {
    console.log('wind:', this.dataModel.Library.Windows);

    return this.dataModel.Library.Windows;
  }
}
