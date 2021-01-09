const fs = require('fs'),
    path = require('path'),
    { execSync } = require('child_process'),
    Handlebars = require('handlebars');

function render(resume) {
    const normalizeCss = fs.readFileSync(__dirname + '/normalize.css', 'utf-8'),
        css = fs.readFileSync(__dirname + '/style.css', 'utf-8'),
        tpl = fs.readFileSync(__dirname + '/resume.hbs', 'utf-8'),
        partialsDir = path.join(__dirname, 'partials'),
        filenames = fs.readdirSync(partialsDir);

    Handlebars.registerHelper('or', or);
    Handlebars.registerHelper('buildPeriod', buildPeriod);
    Handlebars.registerHelper('buildDate', buildDate);

    filenames.forEach(function (filename) {
        const matches = /^([^.]+).hbs$/.exec(filename);
        if (!matches) {
            return;
        }
        const name = matches[1],
            filepath = path.join(partialsDir, filename),
            template = fs.readFileSync(filepath, 'utf8');

        Handlebars.registerPartial(name, template);
    });
    return Handlebars.compile(tpl)({
        normalizeCss,
        css,
        resume
    });
}

const or = (...params) => {
    const length = params.length - 1;
    return length > 0 ? params.slice(0, length).reduce((acc, p) => acc || p) : false;
};

const buildPeriod = (context, startDateField, endDateField) => {
    const startDate = context[startDateField],
        endDate = context[endDateField];
    return formatPeriod(startDate, endDate);
};

const buildDate = (context, dateField) => {
    const date = context[dateField];
    return formatPeriod(date, date);
};

const formatPeriod = (startDate, endDate) => {
    if(!startDate && !endDate) {
        return '';
    }

    const formattedStartDate = startDate ? formatDate(startDate) : 'N/A';
    const formattedEndDate = endDate ? formatDate(endDate) : 'Present';

    if(formattedStartDate === formattedEndDate) {
        return `(${formattedStartDate})`;
    }

    return `(${formattedStartDate} - ${formattedEndDate})`;
};

const formatDate  = dateISO => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = new Date(dateISO);
    return months[date.getMonth()] +' ' + date.getFullYear();
};

const isHeading = line => {
    return !!line.match(/^<h[0-6].*>.*<\/h[0-6]>$/);
}

const pandocCmd = `pandoc cards.md -f markdown -t html -o cards-pandoc.html`;
console.log(`Run => ${pandocCmd}`)
execSync(pandocCmd);

const cards = [];
let card = null;
const cardsPandocHtmlLines = fs.readFileSync('cards-pandoc.html', 'utf-8').split('\n');
cardsPandocHtmlLines
    .map(line => line.trim())
    .filter(line => '' !== line)
    .forEach(line => {
        if(isHeading(line)) {
            if(card) {
                cards.push(card);
            }
            card = {
                content: [line]
            }
        } else {
            card.content.push(line);
        }
    });
if(card) {
    cards.push(card);
}
fs.writeFileSync('cards-pandoc.json', JSON.stringify(cards, null, 2), 'utf-8');
