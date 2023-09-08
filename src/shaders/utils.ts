export const findLowestCubed = (num: number) => {
  let i = 1;
  while (i * i * i <= num) {
    i++;
  }
  return i;
};