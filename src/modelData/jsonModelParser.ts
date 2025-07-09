export class JsonModelParser {
  dataModel: any;

  public async getJson() {
    try {
      const data = await this.loadJson('/data.json');
      this.dataModel = data;
      //this.getStructureLevel(data);
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

  public getStructureLevel({ targetNumber }) {
    const data = this.dataModel;

    console.log('Загруженные данные:', data);
    console.log('-----');
    console.log('Elements:', data.Library.ElementTypes);

    const dataLevel = this.getLevel(data.Site.Building.Storeys, targetNumber);
    console.log('dataLevel', dataLevel);

    const dataWalls = this.getWallsByLevel({ dataLevel, arrWalls: data.Site.Building.Elements.Walls });
    console.log('dataWalls', dataWalls);

    return { dataLevel, dataWalls, ElementTypes: data.Library.ElementTypes };
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
}
