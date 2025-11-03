import { Test, TestingModule } from '@nestjs/testing';
import { PokemonsService } from './pokemons.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';

describe('PokemonsService', () => {
  let service: PokemonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonsService],
    }).compile();

    service = module.get<PokemonsService>(PokemonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a pokemon', async () => {
    const data = { name: 'Pikachu', type: 'Electric' };

    const pokemon = await service.create(data);

    expect(pokemon).toHaveProperty('name');
    expect(pokemon).toHaveProperty('type');

    expect(pokemon).toEqual(
      expect.objectContaining({ name: 'Pikachu', type: 'Electric' }),
    );
  });

  it('should throw 400 error if pokemon already exists', async () => {
    const data = { name: 'Pikachu', type: 'Electric' };

    await service.create(data);

    try {
      await service.create(data);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).toBe(
        `Pokemon with name ${data.name} already exists`,
      );
    }
  });

  it('should return pokemon if exists', async () => {
    const id = 4;

    const result = await service.findOne(id);

    expect(result).toEqual({
      id: 4,
      name: 'charmander',
      type: 'fire',
      hp: 39,
      sprites: [
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png',
      ],
    });
  });

  it('should return the cached pokemon', async () => {
    const id = 4;
    const cacheSpy = jest.spyOn(service.pokemonsCache, 'get');

    await service.findOne(id);
    await service.findOne(id);

    expect(cacheSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalledWith(id);
  });

  it('should return 404 error if pokemon does not exists', async () => {
    const id = 1761889783336;

    try {
      await service.findOne(id);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).toBe(`Pokemon with id ${id} not found`);
    }
  });

  it('should check properties of the pokemon', async () => {
    const id = 4;
    const pokemon = await service.findOne(id);

    expect(pokemon).toHaveProperty('id');
    expect(pokemon).toHaveProperty('name');

    expect(pokemon).toEqual(
      expect.objectContaining({
        id: id,
        // hp: 39,
        //si no conocemos el valor pero si el tipo, se puede usar de esta forma
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        hp: expect.any(Number),
      }),
    );
  });

  it('should find all pokemons and cache them', async () => {
    const pokemons = await service.findAll({ limit: 10, page: 1 });

    expect(pokemons).toBeInstanceOf(Array);
    expect(pokemons.length).toBe(10);

    expect(service.paginatedPokemonsCache.has('10-1')).toBeTruthy();

    // valida que el objeto sea igual y este en el mismo espacio en memoria
    expect(service.paginatedPokemonsCache.get('10-1')).toBe(pokemons);
    expect(service.paginatedPokemonsCache.get('10-1')).toEqual(pokemons);
  });

  it('should return pokemons from cache', async () => {
    const cacheSpy = jest.spyOn(service.paginatedPokemonsCache, 'get');
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await service.findAll({ limit: 10, page: 1 });
    await service.findAll({ limit: 10, page: 1 });

    expect(cacheSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalledWith('10-1');

    expect(fetchSpy).toHaveBeenCalledTimes(11);
  });

  it('should update a pokemon if exists', async () => {
    const id = 4;
    const dto: UpdatePokemonDto = { name: 'Pika', type: 'Electric' };

    const updatedPokemon = await service.update(id, dto);

    expect(updatedPokemon).toHaveProperty('name');
    expect(updatedPokemon).toHaveProperty('type');
    expect(updatedPokemon).toEqual(
      expect.objectContaining({ id: id, name: 'Pika', type: 'Electric' }),
    );
  });

  it('should not update pokemon if not exists', async () => {
    const id = 1761889783336;
    const dto: UpdatePokemonDto = { name: 'Pika', type: 'Electric' };

    try {
      await service.update(id, dto);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).toBe(`Pokemon with id ${id} not found`);
    }
  });

  it('should delete a pokemon if exists', async () => {
    const id = 4;

    // Se hace esta peticion para que lo guarde en cache
    await service.findOne(id);
    await service.remove(id);

    expect(service.pokemonsCache.get(id)).toBeUndefined();
  });

  it('should not delete pokemon if not exists', async () => {
    const id = 1761889783336;

    try {
      await service.remove(id);
      expect(true).toBeFalsy();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(error.message).toBe(`Pokemon with id ${id} not found`);
    }
  });
});
