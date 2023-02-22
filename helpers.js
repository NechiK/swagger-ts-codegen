function transformProperties(properties, swagger) {
    const transformed = [];
    const refs = [];
    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const transformedProperty = transformType(property, swagger);
        transformed.push(`${propertyKey}: ${transformedProperty.propertySymbol};`);
        if (transformedProperty.type === 'enum' || transformedProperty.type === 'interface') {
            refs.push(transformedProperty);
        }
    }

    return {
        propertiesContent: transformed,
        refs
    };
}

function transformRefsToImport(refs, optionsPath, sourcePath) {
    return refs.map(ref => {
        let folderPath;
        if (ref.type === 'enum') {
            folderPath = `${optionsPath}/enums`;
        } else {
            folderPath = `${optionsPath}/interfaces`;
        }

        console.log(folderPath);
        console.log(sourcePath);
        return buildImport(sourcePath, `${folderPath}/${ref.fileName}.${ref.type}`, ref.importSymbol);
    }).join('\n');
}

function buildImport(fromPath, toPath, symbolName) {
    const relativePath = buildRelativePath(fromPath, toPath);
    return `import {${symbolName}} from "${relativePath}"`;
}

function transformArraySymbol(arrayProperty, swagger) {
    const transformedType = !!arrayProperty.$ref ? parseRefToSymbol(arrayProperty, swagger) : transformType(arrayProperty, swagger);
    return {
        ...transformedType,
        propertySymbol: `${transformedType.propertySymbol}[]`
    }
}

function parseRefToSymbol(property, swagger) {
    const {refProperty, refPropertyKey} = getRefProperty(property.$ref, swagger);
    const symbol = transformRefProperty(refProperty, refPropertyKey);

    return {
        type: isRefPropertyEnum(refProperty) ? 'enum' : 'interface',
        importSymbol: symbol,
        propertySymbol: symbol,
        refPropertyKey,
        fileName: dasherize(refPropertyKey)
    };
}

const transformPrimitives = (property) => {
    switch (property.type) {
        case 'integer':
            return {
                type: property.type,
                propertySymbol: `number`
            };
        case 'object':
            return {
                type: property.type,
                propertySymbol: `object`
            };
        default:
            return {
                type: property.type,
                propertySymbol: property.type
            };
    }
}

const transformType = (property, swagger) => {
    if (!!property.$ref) {
        return parseRefToSymbol(property, swagger);
    } else {
        switch (property.type) {
            case 'array':
                return transformArraySymbol(property.items, swagger);
            default:
                return transformPrimitives(property);
        }
    }
}

function getRefProperty(ref, swagger) {
    const refPath = ref.split('/');
    refPath.shift();
    let refProperty = swagger;
    let refPropertyKey = '';
    refPath.forEach(path => {
        refProperty = refProperty[path];
        refPropertyKey = path;
    });
    return {refProperty, refPropertyKey};
}

function transformRefProperty(refProperty, refPropertyKey) {
    if (refProperty.hasOwnProperty('enum')) {
        return `T${refPropertyKey}`;
    } else {
        return `I${refPropertyKey}`;
    }
}

function isRefPropertyEnum(refProperty) {
    return refProperty.hasOwnProperty('enum');
}
