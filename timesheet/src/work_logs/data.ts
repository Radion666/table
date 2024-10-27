export const testData = [
  {
    id: 26,
    facilityId: 3,
    date: '10-2024',
    workDays: {
      '01.10.2024': {
        day: 4,
        night: 5,
        overwork: 1,
      },
      '02.10.2024': 'Б',
      '03.10.2024': 'Б',
      '04.10.2024': {
        day: 4,
        night: 5,
        overwork: 12,
      },
      '05.10.2024': 'В',
      '06.10.2024': {
        day: 4,
        night: 4,
        overwork: 1,
      },
      '07.10.2024': 'В',
      '08.10.2024': 'О',
      '09.10.2024': {
        day: 5,
        night: 5,
        overwork: 1,
      },
      '10.10.2024': 'Б',
      '11.10.2024': 'В',
      '12.10.2024': {
        day: 4,
        night: 4,
        overwork: 4,
      },
      '13.10.2024': {
        day: 5,
        night: 4,
        overwork: 1,
      },
      '14.10.2024': 'Б',
      '15.10.2024': 'Б',
      '16.10.2024': 'В',
      '17.10.2024': 'А',
      '18.10.2024': 'Б',
      '19.10.2024': 'А',
      '20.10.2024': 'О',
      '21.10.2024': {
        day: 3,
        night: 4,
        overwork: 5,
      },
      '22.10.2024': 'Б',
      '23.10.2024': {
        day: 3,
        night: 4,
        overwork: 1,
      },
      '24.10.2024': 'В',
      '25.10.2024': 'Б',
      '26.10.2024': {
        day: 4,
        night: 5,
        overwork: 1,
      },
      '27.10.2024': {
        day: 4,
        night: 4,
        overwork: 4,
      },
    },
    employee: {
      id: 1,
      lastName: 'Тес1',
      firstName: 'Тес2',
      middleName: 'Тес3',
    },
  },
  {
    id: 26,
    facilityId: 3,
    date: '10-2024',
    workDays: {
      '01.10.2024': {
        day: 4,
        night: 5,
        overwork: 1,
      },
      '02.10.2024': 'Б',
      '03.10.2024': 'Б',
      '04.10.2024': {
        day: 4,
        night: 5,
        overwork: 12,
      },
      '05.10.2024': 'В',
      '06.10.2024': {
        day: 4,
        night: 4,
        overwork: 1,
      },
      '07.10.2024': 'В',
      '08.10.2024': 'О',
      '09.10.2024': {
        day: 5,
        night: 5,
        overwork: 1,
      },
      '10.10.2024': 'Б',
      '11.10.2024': 'В',
      '12.10.2024': {
        day: 4,
        night: 4,
        overwork: 4,
      },
      '13.10.2024': {
        day: 5,
        night: 4,
        overwork: 1,
      },
      '14.10.2024': 'Б',
      '15.10.2024': 'Б',
      '16.10.2024': 'В',
      '17.10.2024': 'А',
      '18.10.2024': 'Б',
      '19.10.2024': 'А',
      '20.10.2024': 'О',
      '21.10.2024': {
        day: 3,
        night: 4,
        overwork: 5,
      },
      '22.10.2024': 'Б',
      '23.10.2024': {
        day: 3,
        night: 4,
        overwork: 1,
      },
      '24.10.2024': 'В',
      '25.10.2024': 'Б',
      '26.10.2024': {
        day: 4,
        night: 5,
        overwork: 1,
      },
      '27.10.2024': {
        day: 4,
        night: 4,
        overwork: 4,
      },
    },
    employee: {
      id: 2,
      lastName: 'Тес1',
      firstName: 'Тес2',
      middleName: 'Тес3',
    },
  },
];

export const testEmployeesData = [
  {
    id: 1,
    lastName: 'Тес1',
    firstName: 'Тес2',
    middleName: 'Тес3',
    position: {},
    employmentPeriods: [
      {
        status: 'working',
        startDate: '2024-10-27T16:42:38.171Z',
        endDate: '2024-10-27T16:53:27.827Z',
        createdAt: '2024-10-27T16:42:38.172Z',
      },
      {
        status: 'fired',
        startDate: '2024-10-27T16:53:27.830Z',
        endDate: '2024-10-27T17:42:55.075Z',
        createdAt: '2024-10-27T16:53:27.830Z',
      },
      {
        status: 'working',
        startDate: '2024-09-27T17:42:55.077Z',
        endDate: null,
        createdAt: '2024-10-27T17:42:55.077Z',
      },
    ],
    facilityPeriods: [
      {
        id: 13,
        employeeId: 1,
        startDate: '2024-10-27T17:42:55.071Z',
        endDate: null,
        facilityId: 3,
        createdAt: '2024-10-27T17:42:55.072Z',
      },
    ],
  },
  {
    id: 2,
    lastName: 'Тес1',
    firstName: 'Тес2',
    middleName: 'Тес3',
    position: {},
    employmentPeriods: [
      {
        status: 'working',
        startDate: '2024-10-27T16:42:38.171Z',
        endDate: '2024-10-27T16:53:27.827Z',
        createdAt: '2024-10-27T16:42:38.172Z',
      },
      {
        status: 'fired',
        startDate: '2024-10-27T16:53:27.830Z',
        endDate: '2024-10-27T17:42:55.075Z',
        createdAt: '2024-10-27T16:53:27.830Z',
      },
      {
        status: 'working',
        startDate: '2024-09-27T17:42:55.077Z',
        endDate: null,
        createdAt: '2024-10-27T17:42:55.077Z',
      },
    ],
    facilityPeriods: [
      {
        id: 13,
        employeeId: 1,
        startDate: '2024-10-27T17:42:55.071Z',
        endDate: null,
        facilityId: 3,
        createdAt: '2024-10-27T17:42:55.072Z',
      },
    ],
  },
];

// const copyOfPrev = structuredClone(prev);
// const indexOfCurrentId = copyOfPrev.findIndex((prevField) => prevField.employeeId === id);
// let hoursOfDay: number = 0;
// let hoursOfNight: number = 0;
// let countOfWorkDays: number = 0;
// let hoursOfWeekendWorkDays: number = 0;
// let countOfWeekendWorkDays: number = 0;
// let hoursOfOverworkTwoHours: number = 0;
// let hoursOfOverworkMoreTwoHours: number = 0;

// for (const i in copyOfPrev[indexOfCurrentId].dates) {
//   const element = copyOfPrev[indexOfCurrentId].dates[i];
//   const isWeekend = daysInMonth.find((day) => day.date === i)?.isWeekend;

//   if (typeof element === "object" && element.overwork && !isWeekend) {
//     const value = +element.overwork;

//     if (value <= 2) {
//       hoursOfOverworkTwoHours += value;
//     }
//     if (value > 2) {
//       hoursOfOverworkTwoHours += 2;
//       hoursOfOverworkMoreTwoHours += value - 2;
//     }
//   }

//   if (typeof element === "object" && !isWeekend) {
//     hoursOfDay += +element.day;
//     hoursOfNight += +element.night;
//     if (+element?.day || +element?.night) countOfWorkDays += 1;
//   } else if (typeof element === "object" && isWeekend) {
//     hoursOfWeekendWorkDays += (+element?.day || 0) + (+element.night || 0);

//     if (+element.day || +element.night) {
//       countOfWeekendWorkDays += 1;
//     }
//   }
// }

// copyOfPrev[indexOfCurrentId].total = {
//   hoursOfDay,
//   hoursOfNight,
//   countOfWorkDays,
//   countOfWeekendWorkDays,
//   hoursOfWeekendWorkDays,
//   hoursOfOverworkTwoHours,
//   hoursOfOverworkMoreTwoHours
// };
