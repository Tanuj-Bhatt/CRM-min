using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CRM.IDataProvider;

namespace CRM.DataProvider;

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly DbContext Context;
    protected readonly DbSet<T> Entities;

    public Repository(DbContext context)
    {
        Context = context;
        Entities = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
    {
        return await Entities.FindAsync(id);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await Entities.ToListAsync();
    }

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
    {
        return await Entities.Where(predicate).ToListAsync();
    }

    public async Task AddAsync(T entity)
    {
        await Entities.AddAsync(entity);
    }

    public void Update(T entity)
    {
        Entities.Update(entity);
    }

    public void Remove(T entity)
    {
        Entities.Remove(entity);
    }
}
