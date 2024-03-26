function generateName() {
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const nameLength = Math.floor(Math.random() * 8) + 3; // Random length between 3 and 10
    let name = '';
    for (let i = 0; i < nameLength; i++) {
        if (i % 2 === 0) {
            name += consonants.charAt(Math.floor(Math.random() * consonants.length));
        } else {
            name += vowels.charAt(Math.floor(Math.random() * vowels.length));
        }
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
}

const firstNames = Array.from({ length: 1000 }, generateName);
console.log(firstNames);
