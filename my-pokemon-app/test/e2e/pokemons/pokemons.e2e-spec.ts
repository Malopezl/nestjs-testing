import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { Pokemon } from 'src/pokemons/entities/pokemon.entity';

describe('Pokemons (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Para que las pruebas pasen por /api se debe agregar esta linea
    // app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/pokemons (POST) - with no body', async () => {
    const response = await request(app.getHttpServer()).post('/pokemons');
    const mustHaveErrorMessages = [
      'name must be a string',
      'name should not be empty',
      'type must be a string',
      'type should not be empty',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const messageArray: string[] = response.body.message ?? [];

    expect(response.statusCode).toBe(400);
    expect(mustHaveErrorMessages.length).toBe(messageArray.length);
    //se evalua de esta manera por si el orden no es exacto
    expect(messageArray).toEqual(expect.arrayContaining(mustHaveErrorMessages));
  });

  it('/pokemons (POST) - with valid body', async () => {
    const response = await request(app.getHttpServer()).post('/pokemons').send({
      name: 'Pikachu',
      type: 'Electric',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      name: 'Pikachu',
      type: 'Electric',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      id: expect.any(Number),
      hp: 0,
      sprites: [],
    });
  });

  it('/pokemons (GET) should return paginated list of pokemons', async () => {
    const response = await request(app.getHttpServer())
      .get('/pokemons')
      .query({ limit: 5, page: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.length).toBe(5);

    (response.body as Pokemon[]).forEach((pokemon) => {
      expect(pokemon).toHaveProperty('id');
      expect(pokemon).toHaveProperty('name');
      expect(pokemon).toHaveProperty('type');
      expect(pokemon).toHaveProperty('hp');
      expect(pokemon).toHaveProperty('sprites');
    });
  });

  it('/pokemons (GET) should return 20 paginated pokemons', async () => {
    const response = await request(app.getHttpServer())
      .get('/pokemons')
      .query({ limit: 20, page: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.length).toBe(20);

    (response.body as Pokemon[]).forEach((pokemon) => {
      expect(pokemon).toHaveProperty('id');
      expect(pokemon).toHaveProperty('name');
      expect(pokemon).toHaveProperty('type');
      expect(pokemon).toHaveProperty('hp');
      expect(pokemon).toHaveProperty('sprites');
    });
  });

  it('/pokemons/:id (GET) should return a pokemon by ID', async () => {
    const response = await request(app.getHttpServer()).get('/pokemons/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      name: 'bulbasaur',
      type: 'grass',
      hp: 45,
      sprites: [
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png',
      ],
    });
  });

  it('/pokemons/:id (GET) should return Not found', async () => {
    const pokemonId = 1000000;
    const response = await request(app.getHttpServer()).get(
      `/pokemons/${pokemonId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: `Pokemon with id ${pokemonId} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('/pokemons/:id (PATCH) should update pokemon', async () => {
    const id = 1;
    const dto = { name: 'Pikachu', type: 'Electric' };
    const pokemonResponse = await request(app.getHttpServer()).get(
      `/pokemons/${id}`,
    );

    const bulbasaur = pokemonResponse.body as Pokemon;

    const response = await request(app.getHttpServer())
      .patch(`/pokemons/${id}`)
      .send({ name: 'Pikachu', type: 'Electric' });

    const updatedPokemon = response.body as Pokemon;

    expect(response.statusCode).toBe(200);

    expect(bulbasaur.hp).toBe(updatedPokemon.hp);
    expect(bulbasaur.id).toBe(updatedPokemon.id);
    expect(bulbasaur.sprites).toEqual(updatedPokemon.sprites);

    expect(updatedPokemon.name).toBe(dto.name);
    expect(updatedPokemon.type).toBe(dto.type);
  });

  it('/pokemons/:id (PATCH) should throw a 404', async () => {
    const id = 10000000;

    const response = await request(app.getHttpServer())
      .patch(`/pokemons/${id}`)
      .send({});

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: `Pokemon with id ${id} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('/pokemons/:id (DELETE) should delete pokemon', async () => {
    const id = 1;

    const response = await request(app.getHttpServer()).delete(
      `/pokemons/${id}`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.text).toEqual('Pokemon bulbasaur removed');
  });

  it('/pokemons/:id (DELETE) should throw 404 error', async () => {
    const id = 10000000;

    const response = await request(app.getHttpServer()).delete(
      `/pokemons/${id}`,
    );

    expect(response.statusCode).toBe(404);
  });
});
